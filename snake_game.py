import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Constants
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
GRID_SIZE = 20
GRID_WIDTH = WINDOW_WIDTH // GRID_SIZE
GRID_HEIGHT = WINDOW_HEIGHT // GRID_SIZE

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
PURPLE = (128, 0, 128)

class Snake:
    def __init__(self):
        self.body = [(GRID_WIDTH//2, GRID_HEIGHT//2)]
        self.direction = (1, 0)
        self.grow = False
        
    def move(self):
        head = self.body[0]
        new_head = (head[0] + self.direction[0], head[1] + self.direction[1])
        self.body.insert(0, new_head)
        
        if not self.grow:
            self.body.pop()
        else:
            self.grow = False
    
    def change_direction(self, direction):
        # Prevent reversing into itself
        if (direction[0] * -1, direction[1] * -1) != self.direction:
            self.direction = direction
    
    def check_collision(self):
        head = self.body[0]
        # Wall collision
        if head[0] < 0 or head[0] >= GRID_WIDTH or head[1] < 0 or head[1] >= GRID_HEIGHT:
            return True
        # Self collision
        if head in self.body[1:]:
            return True
        return False

class Food:
    def __init__(self):
        self.position = self.generate_position()
        self.type = random.choice(['normal', 'speed', 'double', 'invincible'])
        self.color = self.get_color()
    
    def generate_position(self):
        return (random.randint(0, GRID_WIDTH-1), random.randint(0, GRID_HEIGHT-1))
    
    def get_color(self):
        colors = {
            'normal': RED,
            'speed': BLUE, 
            'double': GREEN,
            'invincible': YELLOW
        }
        return colors[self.type]

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Snake Game with Power-ups")
        self.clock = pygame.time.Clock()
        self.reset_game()
        self.font = pygame.font.Font(None, 36)
        self.game_over = False
    
    def reset_game(self):
        self.snake = Snake()
        self.food = Food()
        self.score = 0
        self.speed = 10
        self.power_up_timer = 0
        self.invincible = False
        self.game_over = False
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            elif event.type == pygame.KEYDOWN:
                if self.game_over:
                    if event.key == pygame.K_r:
                        self.reset_game()
                    elif event.key == pygame.K_q:
                        return False
                else:
                    if event.key == pygame.K_UP:
                        self.snake.change_direction((0, -1))
                    elif event.key == pygame.K_DOWN:
                        self.snake.change_direction((0, 1))
                    elif event.key == pygame.K_LEFT:
                        self.snake.change_direction((-1, 0))
                    elif event.key == pygame.K_RIGHT:
                        self.snake.change_direction((1, 0))
        return True
    
    def update(self):
        if self.game_over:
            return True
            
        self.snake.move()
        
        # Check food collision
        if self.snake.body[0] == self.food.position:
            self.snake.grow = True
            self.apply_power_up()
            self.food = Food()
        
        # Check collisions (unless invincible)
        if not self.invincible and self.snake.check_collision():
            self.game_over = True
        
        # Update power-up timer
        if self.power_up_timer > 0:
            self.power_up_timer -= 1
            if self.power_up_timer == 0:
                self.speed = 10
                self.invincible = False
        
        return True
    
    def apply_power_up(self):
        if self.food.type == 'normal':
            self.score += 10
        elif self.food.type == 'speed':
            self.score += 10
            self.speed = 15
            self.power_up_timer = 300  # 5 seconds at 60 FPS
        elif self.food.type == 'double':
            self.score += 20
        elif self.food.type == 'invincible':
            self.score += 10
            self.invincible = True
            self.power_up_timer = 180  # 3 seconds
    
    def draw(self):
        self.screen.fill(BLACK)
        
        if not self.game_over:
            # Draw snake
            for segment in self.snake.body:
                rect = pygame.Rect(segment[0] * GRID_SIZE, segment[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
                color = PURPLE if self.invincible else GREEN
                pygame.draw.rect(self.screen, color, rect)
            
            # Draw food
            food_rect = pygame.Rect(self.food.position[0] * GRID_SIZE, self.food.position[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
            pygame.draw.rect(self.screen, self.food.color, food_rect)
            
            # Draw power-up status
            if self.power_up_timer > 0:
                status = "INVINCIBLE!" if self.invincible else "SPEED BOOST!"
                status_text = self.font.render(status, True, WHITE)
                self.screen.blit(status_text, (10, 50))
        else:
            # Game over screen
            game_over_text = self.font.render(f"Game Over! Score: {self.score}", True, WHITE)
            restart_text = self.font.render("Press R to Restart or Q to Quit", True, WHITE)
            
            game_over_rect = game_over_text.get_rect(center=(WINDOW_WIDTH//2, WINDOW_HEIGHT//2 - 30))
            restart_rect = restart_text.get_rect(center=(WINDOW_WIDTH//2, WINDOW_HEIGHT//2 + 30))
            
            self.screen.blit(game_over_text, game_over_rect)
            self.screen.blit(restart_text, restart_rect)
        
        # Always draw score
        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        
        pygame.display.flip()
    
    def run(self):
        running = True
        while running:
            running = self.handle_events()
            if running:
                self.update()
            self.draw()
            self.clock.tick(self.speed)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()